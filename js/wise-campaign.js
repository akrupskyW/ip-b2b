/**
 * wise-campaign.js — "Your food has character" / the WISEcode campaign.
 *
 * One shared campaign: the catalog cast as food-headed figures, the sixteen
 * finished pieces they front, a collector set called Food Truth
 * Wins, and the two eight-second spots cut for it. Pages host it through the
 * reply builders; the artwork rides the shared transcript masonry.
 */

import { esc } from './escape-html.js';
import { masonryGridHtml, cardGridHtml } from './transcript-masonry.js';

const CAMPAIGN_BASE = '../assets/wise-campaign';

/**
 * The brief a member sends to get this campaign. It names every piece that
 * comes back, in the order it comes back, so the ask and the artwork cannot
 * drift apart. Shared because the welcome cards, the intent chip and the
 * "What can I ask?" catalog all send the same one.
 */
export const WISE_CAMPAIGN_BRIEF = [
  'Generate a complete marketing campaign for WISEcode and show me the finished work, not a strategy deck.',
  '',
  'Build it on one idea: every food has a character, and the character is the label. Cast the catalog as people \u2014 the avocado, the broccoli, the quinoa bowl, the salmon, the grapes, the coffee, the taco, the burger, the pizza, the donut and the soda \u2014 shot as food-headed figures in real clothes. Dress the whole foods tailored, calm and unhurried. Dress the heavily processed ones in stained hoodies and ripped denim on a litter-strewn street. Let the wardrobe carry the argument so no line of copy has to explain it, and give me the campaign line and the sign-off.',
  '',
  'Then produce the buy, as artwork rather than a description of artwork:',
  '- A sunset highway billboard carrying the four-up hero line-up.',
  '- A full transit bus wrap, and a van wrap with the rear view.',
  '- Bus-shelter posters, including a paired site where the two panels argue with each other.',
  '- A vertical social cover.',
  '- A teaser one-sheet.',
  '- A magazine page.',
  '- A web leaderboard, and a display ad with the call to action on it.',
  '- A character build-out sheet for the extended cast.',
  '- The merch table \u2014 tote bag and collector cards.',
  '- Two lookbook spreads for the apparel line, every look named and priced.',
  '',
  'Lay the finished pieces out inside the answer, edge to edge, packed at their own shapes instead of in a scrolling row, and let me open any one of them full size.',
  '',
  'Then turn the cast into a playable set called Food Truth Wins: twelve collector cards, six heroes and six villains, each one numbered, with a faction, a role, the thing it stands for, a superpower, the villain it beats or the hero that beats it, and three game stats. Give the heroes the tools \u2014 ingredient vision, processing reveal, score sight, side-by-side comparison, personal fit, food literacy \u2014 and give the villains the tricks those tools defeat: label camouflage, the health halo, a cherry-picked number, a twisted metric, one-size-fits-all advice, jargon. Add two key visuals for the set, one spy thriller and one superhero.',
  '',
  'Every card is the same shape, so run the whole deck on one carousel rather than in the packed grid.',
  '',
  'Cut the set a teaser as well: eight seconds, the camera planted in the dirt with the lens inches off the ground, and the cast rushing past it.',
  '',
  'Then cut it a second spot the same length, drawn rather than rendered \u2014 cel-shaded 2D with a glossy 3D shine and hard rim light. Stand the camera back on an empty plain under shafts of light, bring the heroes in from one side and the villains from the other, and let them meet in a white blast at the middle of frame.',
  '',
  'Play both inside the answer with their own controls and sound, and do not start either one on its own.',
].join('\n');

/**
 * The finished media the campaign shipped — every piece the answer promises,
 * as artwork. Sizes are the real pixel dimensions so the masonry can pack a
 * tile before its image has decoded.
 */
export const WISE_CAMPAIGN_MEDIA = [
  { file: 'billboard-good-taste', w: 1600, h: 900,
    title: 'Good taste. Great characters.', meta: 'Highway billboard \u00b7 the four-up hero' },
  { file: 'shelter-daily-plot-twist', w: 1024, h: 1536,
    title: 'Your daily plot twist.', meta: 'Bus-shelter poster \u00b7 The Soda' },
  { file: 'bus-wrap-big-personalities', w: 1600, h: 900,
    title: 'Big food personalities.', meta: 'Full bus wrap \u00b7 transit' },
  { file: 'social-crew-selfie', w: 941, h: 1672,
    title: 'Your next meal has a crew.', meta: 'Social cover \u00b7 9:16' },
  { file: 'lookbook-wear-your-wisdom', w: 1024, h: 682,
    title: 'Wear your wisdom.', meta: 'WISEWear lookbook \u00b7 eight looks, priced' },
  { file: 'print-looks-arent-the-whole-story', w: 1122, h: 1402,
    title: 'Looks aren\u2019t the whole story.', meta: 'Magazine page \u00b7 The Donut' },
  { file: 'banner-food-has-character', w: 1600, h: 533,
    title: 'Your food has character.', meta: 'Web leaderboard' },
  { file: 'van-wrap-on-the-move', w: 1600, h: 900,
    title: 'Food truth. On the move.', meta: 'Van wrap \u00b7 side & rear' },
  { file: 'poster-next-meal-cast', w: 941, h: 1672,
    title: 'The cast of your next meal.', meta: 'Teaser one-sheet' },
  { file: 'character-sheet-extended-cast', w: 1536, h: 1024,
    title: 'Meet the extended cast.', meta: 'Character sheet \u00b7 six build-outs' },
  { file: 'merch-tote-excellent-taste', w: 1254, h: 1254,
    title: 'Excellent taste.', meta: 'Merch \u00b7 tote & collector cards' },
  { file: 'shelter-pair-not-all-calories', w: 1024, h: 682,
    title: 'Not all calories are created equal.', meta: 'Paired shelter site' },
  { file: 'display-food-intelligence', w: 1600, h: 837,
    title: 'A little food intelligence.', meta: 'Display ad \u00b7 Meet WISEcode' },
  { file: 'lookbook-smart-food-smart-style', w: 1024, h: 682,
    title: 'Smart food. Smart style.', meta: 'WISEWear lookbook \u00b7 the atrium set' },
  { file: 'keyvisual-truth-undercover', w: 1600, h: 900,
    title: 'The truth is undercover.', meta: 'Food Truth Wins \u00b7 key visual 01, the spy set' },
  { file: 'keyvisual-clarity-saves-the-day', w: 1600, h: 900,
    title: 'Clarity saves the day.', meta: 'Food Truth Wins \u00b7 key visual 02, the superhero set' },
];

/**
 * Food Truth Wins — the whole deck, in the order it is numbered on the cards
 * themselves. The first twelve are the original cast; the twelve behind them
 * are the campaign's own characters dealt into the same game.
 *
 * Every card is the same 2:3 shape, which is why they sit in a fixed grid
 * rather than the packed masonry the finished pieces use. Each hero's tool
 * answers one villain's trick, and that pairing is the whole argument of the
 * campaign turned into a game.
 */
export const WISE_CAMPAIGN_CARDS = [
  { file: 'agent-apple', name: 'Agent Apple',
    faction: 'Hero', role: 'Spy', power: 'Ingredient Vision' },
  { file: 'captain-carrot', name: 'Captain Carrot',
    faction: 'Hero', role: 'Superhero', power: 'Processing Reveal' },
  { file: 'dr-blueberry', name: 'Dr. Blueberry',
    faction: 'Hero', role: 'Scientist', power: 'Score Sight' },
  { file: 'lentil-legend', name: 'Lentil Legend',
    faction: 'Hero', role: 'Superhero', power: 'Side-by-Side Shield' },
  { file: 'kiwi-key', name: 'Kiwi Key',
    faction: 'Hero', role: 'Spy', power: 'Personal Fit' },
  { file: 'professor-pear', name: 'Professor Pear',
    faction: 'Hero', role: 'Scientist', power: 'Knowledge Link' },
  { file: 'baron-bonbon', name: 'Baron Bonbon',
    faction: 'Villain', role: 'Mastermind', power: 'Label Camouflage' },
  { file: 'madam-marshmallow', name: 'Madam Marshmallow',
    faction: 'Villain', role: 'Illusionist', power: 'Health Halo' },
  { file: 'doctor-frosting', name: 'Doctor Frosting',
    faction: 'Villain', role: 'Rogue scientist', power: 'Cherry-Pick Ray' },
  { file: 'pretzel-plot', name: 'Pretzel Plot',
    faction: 'Villain', role: 'Schemer', power: 'Metric Twist' },
  { file: 'lord-licorice', name: 'Lord Licorice',
    faction: 'Villain', role: 'Double agent', power: 'One-Size Snare' },
  { file: 'count-cookie', name: 'Count Cookie',
    faction: 'Villain', role: 'Decoy master', power: 'Jargon Vault' },
  { file: 'agent-avocado', name: 'Agent Avocado',
    faction: 'Hero', role: 'Spy', power: 'Scan Sight' },
  { file: 'broccoli-beacon', name: 'Broccoli Beacon',
    faction: 'Hero', role: 'Superhero', power: 'Clarity Beam' },
  { file: 'quinoa-quest', name: 'Quinoa Quest',
    faction: 'Hero', role: 'Strategist', power: 'Pantry Map' },
  { file: 'taco-tactic', name: 'Taco Tactic',
    faction: 'Hero', role: 'Strategist', power: 'Next-Step Navigator' },
  { file: 'grape-guardian', name: 'Grape Guardian',
    faction: 'Hero', role: 'Advocate', power: 'Truth Network' },
  { file: 'burger-bluff', name: 'Burger Bluff',
    faction: 'Villain', role: 'Distractor', power: 'Package Mask' },
  { file: 'pizza-phantom', name: 'Pizza Phantom',
    faction: 'Villain', role: 'Disruptor', power: 'Ingredient Fog' },
  { file: 'donut-detour', name: 'Donut Detour',
    faction: 'Villain', role: 'Disruptor', power: 'Distraction Loop' },
  { file: 'soda-spin', name: 'Soda Spin',
    faction: 'Villain', role: 'Strategist', power: 'Number Spotlight' },
  { file: 'coffee-cipher', name: 'Coffee Cipher',
    faction: 'Villain', role: 'Disruptor', power: 'Jargon Maze' },
  { file: 'professor-puff', name: 'Professor Puff',
    faction: 'Villain', role: 'Disruptor', power: 'Hype Cloud' },
];

/** How the deck splits, counted rather than stated, so adding a card can't
    leave the copy claiming the old numbers. */
function cardFactions() {
  const of = (f) => WISE_CAMPAIGN_CARDS.filter((c) => c.faction === f).length;
  const wild = of('Wildcard');
  return `${of('Hero')} heroes, ${of('Villain')} villains`
    + (wild ? ` and ${wild === 1 ? 'a wildcard' : `${wild} wildcards`}` : '');
}

/**
 * The two spots the card set was cut. The teaser plants the camera in the dirt
 * and lets the cast run past it; the face-off is drawn rather than rendered —
 * cel-shaded 2D with a glossy shine — and stands back far enough to watch both
 * sides charge into each other. Both play inside the answer on the shared
 * inline-film component, so they behave like the brand film: real controls,
 * sound, and nothing starts until the member presses play.
 */
export const WISE_CAMPAIGN_FILMS = Object.freeze([
  Object.freeze({
    id: 'teaser',
    file: 'teaser-food-truth-wins.mp4',
    title: 'Food Truth Wins \u00b7 the teaser',
    meta: 'Ground-level rush \u00b7 8 seconds \u00b7 with sound',
  }),
  Object.freeze({
    id: 'faceoff',
    file: 'faceoff-food-truth-wins.mp4',
    title: 'Food Truth Wins \u00b7 the face-off',
    meta: 'Heroes against villains \u00b7 8 seconds \u00b7 with sound',
  }),
]);

/** A film by its id, so a caller names the one it wants rather than an index. */
function filmById(id) {
  return WISE_CAMPAIGN_FILMS.find((f) => f.id === id) || WISE_CAMPAIGN_FILMS[0];
}

/** The named cuts of the buy a follow-up can ask for on its own. */
const MEDIA_CUTS = {
  cast: ['billboard-good-taste', 'character-sheet-extended-cast', 'poster-next-meal-cast', 'social-crew-selfie'],
  ooh: ['billboard-good-taste', 'bus-wrap-big-personalities', 'van-wrap-on-the-move', 'shelter-daily-plot-twist', 'shelter-pair-not-all-calories'],
  print: ['print-looks-arent-the-whole-story', 'banner-food-has-character', 'display-food-intelligence'],
  looks: ['lookbook-wear-your-wisdom', 'lookbook-smart-food-smart-style', 'merch-tote-excellent-taste'],
  keyvisuals: ['keyvisual-truth-undercover', 'keyvisual-clarity-saves-the-day'],
};

function mediaCut(cut) {
  const want = MEDIA_CUTS[cut] || [];
  return want.map((f) => WISE_CAMPAIGN_MEDIA.find((m) => m.file === f)).filter(Boolean);
}

/**
 * One film as a figure for the transcript, named by its id.
 */
export function campaignFilmHtml(id, base) {
  const film = filmById(id);
  const b = String(base || CAMPAIGN_BASE).replace(/\/$/, '');
  return (
    '<figure class="sc-inline-film">'
    + '<video class="sc-inline-film-media" controls playsinline preload="metadata">'
    + `<source src="${esc(`${b}/${film.file}`)}" type="video/mp4">`
    + 'Your browser can\u2019t play this film.'
    + '</video>'
    + '</figure>'
  );
}

/** Both films, in the order they were cut. */
export function campaignFilmsHtml(base) {
  return WISE_CAMPAIGN_FILMS.map((f) => campaignFilmHtml(f.id, base)).join('');
}

/** Any set of media pieces as an edge-to-edge masonry grid. */
function gridHtml(opts) {
  const o = opts || {};
  const b = String(o.base || CAMPAIGN_BASE).replace(/\/$/, '');
  const items = Array.isArray(o.items) ? o.items : [];
  return masonryGridHtml({
    id: o.id,
    label: o.label,
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
export function campaignMediaHtml(base) {
  return gridHtml({
    base,
    id: 'wise-campaign-media',
    label: 'Your food has character \u00b7 the campaign',
    items: WISE_CAMPAIGN_MEDIA,
  });
}

/**
 * The collector set as its own grid. Same viewer as the masonry above — the
 * cards only leave that layout because they are all one shape, so there is
 * nothing to pack and every row is the same height already.
 */
export function campaignCardsHtml(base) {
  const b = `${String(base || CAMPAIGN_BASE).replace(/\/$/, '')}/cards`;
  return cardGridHtml({
    id: 'wise-campaign-cards',
    label: 'Food Truth Wins \u00b7 the collector set',
    aspect: 2 / 3,
    items: WISE_CAMPAIGN_CARDS.map((c) => ({
      src: `${b}/${c.file}.jpg`,
      thumb: `${b}/thumbs/${c.file}.jpg`,
      w: 1024,
      h: 1536,
      title: c.name,
      meta: `${c.faction} \u00b7 ${c.role} \u00b7 ${c.power}`,
    })),
  });
}

/* A pane treats every top-level `.wa-block` as one slide, so an output has to
   arrive inside one or the carousel cannot see it. */
function block(html) {
  return `<div class="wa-block">${html}</div>`;
}

/**
 * Every output one campaign turn produced, in the order it produced them.
 *
 * The artwork is output, not decoration inside a paragraph — so it leaves the
 * answer and goes through the host's own surfacing door, which posts a chip
 * for each piece and writes the piece itself into the Output pane. Nothing
 * opens until the member taps one of those chips.
 *
 * `[which, block]` is the pair `surfaceSet` takes, so a host hands the whole
 * array over and the count picks the layout.
 */
export function campaignOutputs(base) {
  return [
    ['visuals', {
      icon: 'wallpaper',
      title: 'Your food has character \u00b7 the campaign',
      meta: `${WISE_CAMPAIGN_MEDIA.length} finished pieces \u00b7 billboard, wraps, shelters, print, merch & the two lookbooks`,
      say: `I\u2019ve laid out all ${WISE_CAMPAIGN_MEDIA.length} finished pieces below \u2014 the buy, the print work, the merch and both lookbooks together. Tap any one to see it full size.`,
      html: block(campaignMediaHtml(base)),
    }],
    ['visuals', {
      icon: 'style',
      title: 'Food Truth Wins \u00b7 the collector set',
      meta: `${WISE_CAMPAIGN_CARDS.length} numbered cards \u00b7 ${cardFactions()}`,
      say: `Then I dealt out the whole collector set \u2014 ${WISE_CAMPAIGN_CARDS.length} cards, ${cardFactions()}. Every card is the same shape, so they sit in an even grid rather than the packed one above.`,
      html: block(campaignCardsHtml(base)),
    }],
    ...WISE_CAMPAIGN_FILMS.map((f, i) => ['visuals', {
      icon: 'movie',
      title: f.title,
      meta: f.meta,
      say: i === 0
        ? `And I cut the set ${WISE_CAMPAIGN_FILMS.length} spots. Here\u2019s the first \u2014 the teaser, eight seconds with the camera planted in the dirt. It won\u2019t start on its own.`
        : 'Here\u2019s the second \u2014 the face-off, drawn rather than rendered, heroes in from one side and villains from the other.',
      html: block(campaignFilmHtml(f.id, base)),
    }]),
  ];
}

/** One cut of the buy as an output, named by its key in MEDIA_CUTS. */
function cutOutput(cut, icon, title, meta, say, base) {
  const items = mediaCut(cut);
  if (!items.length) return null;
  return ['visuals', {
    icon,
    title,
    meta: `${items.length} pieces \u00b7 ${meta}`,
    say: `${say} \u2014 ${items.length} pieces. Tap any one to see it full size.`,
    html: block(gridHtml({ id: `wise-campaign-${cut}`, label: title, items, base })),
  }];
}

/**
 * What each follow-up surfaces, keyed by the intent that asks for it. Same
 * `[which, block]` pairs as the campaign itself, so every one of these goes
 * out through `surfaceSet` and arrives as chips rather than as figures
 * wedged into the prose.
 */
export function campaignFollowupOutputs(intent, base) {
  switch (intent) {
    case 'campaign_cast':
      return [cutOutput('cast', 'groups', 'The cast \u00b7 hero line-up & build-outs',
        'the cast on its own',
        'I\u2019ve pulled out the pieces that carry the cast on its own', base)].filter(Boolean);
    case 'campaign_ooh':
      return [cutOutput('ooh', 'signpost', 'Out-of-home \u00b7 billboard, wraps & shelters',
        'the out-of-home buy',
        'Here\u2019s the out-of-home buy on its own', base)].filter(Boolean);
    case 'campaign_print':
      return [cutOutput('print', 'ad_units', 'Print & digital \u00b7 page, leaderboard & display',
        'print & digital',
        'Here\u2019s the print and digital work', base)].filter(Boolean);
    case 'campaign_look':
      return [cutOutput('looks', 'checkroom', 'WISEWear \u00b7 lookbooks & merch',
        'every look named and priced',
        'Here are the WISEWear lookbooks and the merch table', base)].filter(Boolean);
    case 'campaign_cards':
      return [
        ['visuals', {
          icon: 'style',
          title: 'Food Truth Wins \u00b7 the collector set',
          meta: `${WISE_CAMPAIGN_CARDS.length} numbered cards \u00b7 ${cardFactions()}`,
          say: `Here\u2019s the deck in full \u2014 ${WISE_CAMPAIGN_CARDS.length} cards, ${cardFactions()}. Tap any one to read its stats.`,
          html: block(campaignCardsHtml(base)),
        }],
        cutOutput('keyvisuals', 'auto_awesome', 'Food Truth Wins \u00b7 key visuals',
          'the spy set and the superhero set',
          'And the key visuals that sell it as a world', base),
      ].filter(Boolean);
    case 'campaign_teaser':
      return WISE_CAMPAIGN_FILMS.map((f, i) => ['visuals', {
        icon: 'movie',
        title: f.title,
        meta: f.meta,
        say: i === 0
          ? `Both spots are here \u2014 ${WISE_CAMPAIGN_FILMS.length} of them, eight seconds each, with sound. This is the teaser; press play when you want it.`
          : 'And this is the face-off, the drawn one.',
        html: block(campaignFilmHtml(f.id, base)),
      }]);
    default:
      return [];
  }
}

export function campaignReply() {
  return (
    '<p>Here is the campaign, finished — not a strategy deck. One idea carries all of it: <strong>your food has character</strong>, and the character is the label.</p>'
    + '<p>The cast is the catalog. <strong>The Avocado</strong> in the forest tracksuit, <strong>the Broccoli</strong>, <strong>the Quinoa Bowl</strong>, <strong>the Salmon</strong>, <strong>the Grapes</strong>, <strong>the Coffee</strong>, <strong>the Taco</strong> — tailored, unhurried, sunglasses on, shot like people who have nothing to hide. Then <strong>the Burger</strong>, <strong>the Pizza</strong>, <strong>the Donut</strong> and <strong>the Soda</strong>, in stained hoodies and ripped denim on a litter-strewn street, and no line of copy has to explain the difference. The sign-off is <em>Know your Food Truth</em>.</p>'
    + `<p>${WISE_CAMPAIGN_MEDIA.length} pieces came out of it — the highway billboard, the bus wrap, the van, the shelter posters, the vertical social cover, the magazine page, the web banners, the merch table, the character build-out sheet, the two <strong>WISEWear</strong> lookbooks with every look priced, and the two key visuals for the card set.</p>`
    + `<p>The cast also plays. <strong>Food Truth Wins</strong> is the collector set — ${WISE_CAMPAIGN_CARDS.length} numbered cards, and every hero&rsquo;s tool answers a villain&rsquo;s trick. <strong>Agent Apple</strong> reads what <strong>Baron Bonbon</strong> hides behind friendly words, <strong>Dr. Blueberry</strong> restores the context <strong>Doctor Frosting</strong> cherry-picks away, and <strong>Agent Avocado</strong> exposes the packaging <strong>Burger Bluff</strong> is hiding behind.</p>`
    + `<p>And the set moves — ${WISE_CAMPAIGN_FILMS.length} spots, eight seconds each, with sound. The <strong>teaser</strong> puts the camera in the dirt and lets the cast come past it at a sprint. The <strong>face-off</strong> is drawn rather than rendered — cel-shaded 2D with a glossy shine — and stands back while the heroes charge in from one side and the villains from the other.</p>`
  );
}

export function campaignCastReply() {
  return (
    '<p>The cast is the argument. Every character is a food from the catalog wearing what its label earned — so the wardrobe does the work a line of copy would otherwise have to do.</p>'
    + '<p><strong>The Avocado</strong> is the lead: forest-green tracksuit, gold chain, nothing to prove. <strong>The Broccoli</strong>, <strong>the Quinoa Bowl</strong>, <strong>the Salmon</strong>, <strong>the Grapes</strong> and <strong>the Coffee</strong> are cut the same way — tailored, unhurried, shot in warm light. <strong>The Taco</strong> sits in the middle, because a taco can go either way and the campaign is honest about that.</p>'
    + '<p>Then the other side of the street. <strong>The Burger</strong>, <strong>the Pizza</strong>, <strong>the Donut</strong> and <strong>the Soda</strong> are in stained hoodies and ripped denim under a flickering light, surrounded by their own packaging. Nobody calls them villains in the copy. They are just dressed as what they are.</p>'
    + `<p>The four-up hero, the extended build-out sheet, the one-sheet and the vertical social cover are the ${mediaCut('cast').length} pieces that carry the cast on its own.</p>`
  );
}

export function campaignOohReply() {
  return (
    '<p>The out-of-home buy is where the cast is life-size, so it is the half of the campaign that has to work at sixty miles an hour and from across a street.</p>'
    + '<p>The <strong>sunset highway billboard</strong> carries the four-up hero line-up under <em>Good taste. Great characters.</em> The <strong>full transit bus wrap</strong> puts the whole crew down one flank, and the <strong>van wrap</strong> is shown side and rear so the back-door crop is visible rather than promised.</p>'
    + '<p>The shelter posters are the close-range work: <strong>the Soda</strong> alone as <em>Your daily plot twist</em>, and a <strong>paired site</strong> where two panels argue with each other across the gap — <em>Not all calories are created equal</em> only lands because you can see both at once.</p>'
  );
}

export function campaignPrintReply() {
  return (
    '<p>Print and digital are where the campaign gets to use a sentence, so these three pieces are the only ones carrying an actual argument rather than a look.</p>'
    + '<p>The <strong>magazine page</strong> is <strong>the Donut</strong> under <em>Looks aren&rsquo;t the whole story</em> — the one execution that earns a paragraph of body copy. The <strong>web leaderboard</strong> runs the line flat and wide at <em>Your food has character</em>. The <strong>display ad</strong> is the only piece with a call to action on it: <em>A little food intelligence</em>, then Meet WISEcode.</p>'
  );
}

export function campaignLookbookReply() {
  return (
    '<p><strong>WISEWear</strong> is the apparel line the campaign dresses its cast in, so the lookbook is styling rather than merch photography.</p>'
    + '<p><em>Wear your wisdom</em> is the first spread — eight looks, every one named and priced, shot on the characters themselves. <em>Smart food. Smart style.</em> is the atrium set, the same line in daylight on glass and stone.</p>'
    + '<p>The merch table is the third piece: the tote under <em>Excellent taste</em>, with the collector cards fanned out beside it.</p>'
  );
}

export function campaignCardsReply() {
  return (
    `<p><strong>Food Truth Wins</strong> turns the cast into a playable set — ${WISE_CAMPAIGN_CARDS.length} numbered cards, ${cardFactions()}, each with a faction, a role, a superpower and three game stats.</p>`
    + '<p>The heroes carry the tools WISEcode actually gives you. <strong>Agent Apple</strong> has Ingredient Vision, <strong>Captain Carrot</strong> has Processing Reveal, <strong>Dr. Blueberry</strong> has Score Sight, <strong>Lentil Legend</strong> has the Side-by-Side Shield, <strong>Kiwi Key</strong> has Personal Fit, and <strong>Professor Pear</strong> has the Knowledge Link.</p>'
    + '<p>Every villain opposite them is a trick one of those tools defeats. <strong>Baron Bonbon</strong> runs Label Camouflage, <strong>Madam Marshmallow</strong> the Health Halo, <strong>Doctor Frosting</strong> the Cherry-Pick Ray, <strong>Pretzel Plot</strong> the Metric Twist, <strong>Lord Licorice</strong> the One-Size Snare, and <strong>Count Cookie</strong> the Jargon Vault. That pairing is the whole argument of the campaign turned into a game.</p>'
    + '<p>The rest of the deck is the campaign&rsquo;s own cast dealt into the same game, and it pairs off the same way. <strong>Agent Avocado</strong>&rsquo;s Scan Sight strips <strong>Burger Bluff</strong>&rsquo;s Package Mask, <strong>Broccoli Beacon</strong>&rsquo;s Clarity Beam cuts <strong>Pizza Phantom</strong>&rsquo;s Ingredient Fog, <strong>Quinoa Quest</strong>&rsquo;s Pantry Map breaks <strong>Donut Detour</strong>&rsquo;s loop, <strong>Taco Tactic</strong>&rsquo;s Next-Step Navigator walks out of <strong>Coffee Cipher</strong>&rsquo;s Jargon Maze, and <strong>Grape Guardian</strong>&rsquo;s Truth Network deflates <strong>Professor Puff</strong>&rsquo;s Hype Cloud.</p>'
    + '<p>The set has two key visuals as well — one shot as a spy thriller, one as a superhero picture — so it can be sold as a world and not just a deck.</p>'
  );
}

export function campaignTeaserReply() {
  return (
    `<p>There are ${WISE_CAMPAIGN_FILMS.length} spots and they are eight seconds each, cut from opposite ends of the same idea.</p>`
    + '<p>The <strong>teaser</strong> only has one move: plant the camera in the dirt, lens inches off the ground, and let the cast run past it. <strong>Captain Carrot</strong> lands in the crater. <strong>Lentil Legend</strong> launches out of it. <strong>Pretzel Plot</strong> comes straight down the barrel of the lens, and the dust closes over everything before the sign-off.</p>'
    + '<p>The <strong>face-off</strong> steps back and draws it instead — cel-shaded 2D with a glossy shine and a hard rim light, on an empty plain under shafts of light. <strong>Agent Apple</strong>, <strong>Professor Pear</strong>, <strong>Captain Carrot</strong> and <strong>Kiwi Key</strong> charge in from one side; <strong>Madam Marshmallow</strong>, <strong>Lord Licorice</strong>, <strong>Count Cookie</strong> and <strong>Doctor Frosting</strong> come the other way with the Cherry-Pick Ray already firing. They meet in a white blast at the middle of frame and hold there.</p>'
    + '<p>Both have real controls and real sound, and neither will start on its own. Press play when you want them.</p>'
  );
}

if (typeof window !== 'undefined') {
  window.WiseCampaign = {
    media: WISE_CAMPAIGN_MEDIA,
    mediaHtml: campaignMediaHtml,
    cards: WISE_CAMPAIGN_CARDS,
    cardsHtml: campaignCardsHtml,
    films: WISE_CAMPAIGN_FILMS,
    filmHtml: campaignFilmHtml,
    filmsHtml: campaignFilmsHtml,
    brief: WISE_CAMPAIGN_BRIEF,
    outputs: campaignOutputs,
    followupOutputs: campaignFollowupOutputs,
    campaignReply,
    castReply: campaignCastReply,
    oohReply: campaignOohReply,
    printReply: campaignPrintReply,
    lookbookReply: campaignLookbookReply,
    cardsSetReply: campaignCardsReply,
    teaserReply: campaignTeaserReply,
  };
}
