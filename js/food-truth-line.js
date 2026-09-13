/**
 * food-truth-line.js — FOODTRUTH, the WISEcode clothing line.
 *
 * A full apparel line on the owls and the lockup the app already has: kids
 * through adults, black-tie to the beach, and the accessories that go with
 * them. Nineteen finished lookbook pages, packed into the answer as masonry.
 *
 * Pages host it through the reply builders; the artwork rides the shared
 * transcript masonry.
 */

import { masonryGridHtml } from './transcript-masonry.js';

const LINE_BASE = '../assets/food-truth-line';

/**
 * The brief a member sends to get this line. It names every piece that comes
 * back, in the order it comes back, so the ask and the artwork cannot drift
 * apart. Shared because the welcome card, the intent chip and the
 * "What can I ask?" catalog all send the same one.
 */
export const FOOD_TRUTH_LINE_BRIEF = [
  'Create a complete clothing line for WISEcode and show me the finished lookbook, not a merchandising deck.',
  '',
  'Call the line FOODTRUTH. Build it on the owls and the lockup we already have — do not invent a new mascot and do not restyle the ones we have. Cover the whole wardrobe: kids through adults, black-tie to street and the beach, and the accessories that go with each set. The kids line is KNOW MORE. EAT WISE. The adult sign-off is The truth is in the code.',
  '',
  'Then produce the line, as lookbook pages rather than a description of clothes:',
  '- Kids knits — sweaters, polos and tees, on the children and as stills.',
  '- The kids smart set — polo, hoodie, tennis dress and the knit row under them.',
  '- The kids street set — hoodies, joggers and the belt bag, FOODTRUTH on the chest.',
  '- Kids accessories on cream: hats, bags, belts, socks and the bottle.',
  '- Kids accessories in colour: caps, beanies, packs, scrunchies and socks.',
  '- Three kids graphic pairs: Think Wise and the vertical lockup; Be kindly, Be wise; WISE and Stay Wise.',
  '- The kids swim prints in four colourways, rash guards and suits.',
  '- WISE Adventures at the beach — the blue owl print, tent, umbrella and towel.',
  '- The lockup at the beach — navy and white, chairs, tent and suits.',
  '- Adult everyday — tees, tank, hoodie, tote and bottle, The truth is in the code.',
  '- The family lockup, matching tees in the kitchen and the woods.',
  '- Two adult graphics: the owl face on black, and Be wise with the back print.',
  '- The owl-paisley midi dress.',
  '- The ivory evening gown, one-shoulder, owl jacquard.',
  '- The navy house suit.',
  '- The black-tie tuxedo, owl jacquard.',
  '',
  'Lay the finished pages out inside the answer, edge to edge, packed at their own shapes instead of in a scrolling row, and let me open any one of them full size.',
].join('\n');

/**
 * The finished lookbook the line shipped. Sizes are the real pixel dimensions
 * so the masonry can pack a tile before its image has decoded.
 */
export const FOOD_TRUTH_LINE_MEDIA = [
  { file: 'kids-knits', w: 1600, h: 1067,
    title: 'The kids knits.', meta: 'FOODTRUTH Kids \u00b7 sweaters, polos & tees' },
  { file: 'kids-smart', w: 1600, h: 1067,
    title: 'The kids smart set.', meta: 'FOODTRUTH Kids \u00b7 polo, hoodie, tennis dress & knits' },
  { file: 'kids-street', w: 1600, h: 1067,
    title: 'The kids street set.', meta: 'FOODTRUTH Kids \u00b7 hoodies, joggers & the belt bag' },
  { file: 'kids-accessories-cream', w: 1600, h: 1067,
    title: 'The cream accessories.', meta: 'FOODTRUTH Kids \u00b7 hats, bags, belts, socks & bottle' },
  { file: 'kids-accessories-color', w: 1600, h: 1067,
    title: 'The color accessories.', meta: 'FOODTRUTH Kids \u00b7 caps, packs, scrunchies & socks' },
  { file: 'kids-graphic-think-wise', w: 1600, h: 1200,
    title: 'Think Wise.', meta: 'Kids graphic \u00b7 Sage on cream and forest' },
  { file: 'kids-graphic-be-kindly', w: 1600, h: 1200,
    title: 'Be kindly. Be wise.', meta: 'Kids graphic \u00b7 the pink owl on blush and cream' },
  { file: 'kids-graphic-stay-wise', w: 1600, h: 1200,
    title: 'Stay Wise.', meta: 'Kids graphic \u00b7 Ollie on blue and cream' },
  { file: 'kids-swim-prints', w: 1600, h: 1281,
    title: 'The swim prints.', meta: 'Kids swim \u00b7 four colorways, rash guards & suits' },
  { file: 'kids-beach-adventures', w: 1600, h: 1281,
    title: 'WISE Adventures at the beach.', meta: 'Kids swim \u00b7 tent, umbrella, towel & the blue owl print' },
  { file: 'beach-lockup', w: 1600, h: 1281,
    title: 'The lockup, at the beach.', meta: 'WISEcode swim \u00b7 navy & white, chairs, tent & suits' },
  { file: 'adult-everyday', w: 1600, h: 1067,
    title: 'The truth is in the code.', meta: 'Adult everyday \u00b7 tees, tank, hoodie, tote & bottle' },
  { file: 'family-lockup', w: 1600, h: 1067,
    title: 'The family lockup.', meta: 'Adult & kids \u00b7 matching tees in the kitchen and the woods' },
  { file: 'adult-graphic-owl-face', w: 1600, h: 1281,
    title: 'The owl, on black.', meta: 'Adult graphic \u00b7 long sleeve, the face only' },
  { file: 'adult-graphic-be-wise', w: 1281, h: 1600,
    title: 'Be wise.', meta: 'Adult graphic \u00b7 long sleeve, front, sleeve & back' },
  { file: 'dress-owl-paisley', w: 1280, h: 1600,
    title: 'The owl paisley dress.', meta: 'Womenswear \u00b7 midi slip, owl jacquard' },
  { file: 'gown-evening', w: 1281, h: 1600,
    title: 'The evening gown.', meta: 'Womenswear \u00b7 one-shoulder silk, owl jacquard' },
  { file: 'suit-navy-house', w: 1280, h: 1600,
    title: 'The house suit.', meta: 'Menswear \u00b7 navy monogram, the lockup on the wall' },
  { file: 'tuxedo-owl-jacquard', w: 1281, h: 1600,
    title: 'Black tie, owl jacquard.', meta: 'Menswear \u00b7 three-piece tuxedo' },
];

/** The named cuts a follow-up can ask for on its own. */
const MEDIA_CUTS = {
  kids: ['kids-knits', 'kids-smart', 'kids-street'],
  accessories: ['kids-accessories-cream', 'kids-accessories-color'],
  graphic: ['kids-graphic-think-wise', 'kids-graphic-be-kindly', 'kids-graphic-stay-wise',
    'adult-graphic-owl-face', 'adult-graphic-be-wise'],
  swim: ['kids-swim-prints', 'kids-beach-adventures', 'beach-lockup'],
  everyday: ['adult-everyday', 'family-lockup'],
  formal: ['dress-owl-paisley', 'gown-evening', 'suit-navy-house', 'tuxedo-owl-jacquard'],
};

function mediaCut(cut) {
  const want = MEDIA_CUTS[cut] || [];
  return want.map((f) => FOOD_TRUTH_LINE_MEDIA.find((m) => m.file === f)).filter(Boolean);
}

/** Any set of pages as an edge-to-edge masonry grid. */
function gridHtml(opts) {
  const o = opts || {};
  const b = String(o.base || LINE_BASE).replace(/\/$/, '');
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
 * The lookbook as an edge-to-edge masonry grid for the transcript. Thumbnails
 * carry the grid; the viewer opens the full-size file.
 */
export function clothingMediaHtml(base) {
  return gridHtml({
    base,
    id: 'food-truth-line-media',
    label: 'FOODTRUTH \u00b7 the clothing line',
    items: FOOD_TRUTH_LINE_MEDIA,
  });
}

export function clothingReply() {
  return (
    '<p>Here is the line, finished — not a merchandising deck. One name carries all of it: <strong>FOODTRUTH</strong>. The owls and the lockup you already have are the mark; nothing was invented for this.</p>'
    + '<p>It runs the whole wardrobe. Kids first: knits, the smart set, the street set, then the accessories on cream and in colour. Three graphic pairs for the children — <em>Think Wise</em>, <em>Be kindly. Be wise.</em>, <em>Stay Wise</em> — then swim, from the four colourway prints to the blue owl tent on the sand. Adults pick up the same lockup: everyday tees and a hoodie under <em>The truth is in the code</em>, the family in matching shirts, two long-sleeve graphics, and then the other end of the rail — the paisley dress, the evening gown, the navy house suit, and black tie in owl jacquard.</p>'
    + `<p>${FOOD_TRUTH_LINE_MEDIA.length} lookbook pages came out of it. They are laid out below, edge to edge. Tap any one to open it full size.</p>`
    + clothingMediaHtml()
  );
}

export function clothingKidsReply() {
  return (
    '<p>The kids line is where FOODTRUTH learns to be a brand a child would actually wear, not a logo on a tiny adult shirt.</p>'
    + '<p>The knits are the quiet start — sweaters, polos and tees, owl small on the chest. The smart set is the school gate: a polo and shorts, a hoodie and skirt, a tennis dress, and the knit row underneath so you can see the colours as products. The street set is the one that photographs: hoodies and joggers, <em>FOODTRUTH</em> on the chest, belt bag on the last kid, and the line still readable at pavement distance.</p>'
    + gridHtml({
      id: 'food-truth-line-kids',
      label: 'FOODTRUTH Kids \u00b7 the clothes',
      items: mediaCut('kids'),
    })
  );
}

export function clothingAccessoriesReply() {
  return (
    '<p>The accessories are how a kids line fills a table, not just a rail of hangers. Two pages, two temperatures.</p>'
    + '<p>Cream is the quiet set: baseball caps, a bucket, backpacks, a satchel, belts, socks and a bottle, owl small enough to read as hardware. Color is the loud set: caps and beanies in the six brights, packs, a scrunchie, a pouch, keychains, and the sock row. Same owl. Same line. Different mood.</p>'
    + gridHtml({
      id: 'food-truth-line-accessories',
      label: 'FOODTRUTH Kids \u00b7 the accessories',
      items: mediaCut('accessories'),
    })
  );
}

export function clothingGraphicReply() {
  return (
    '<p>The graphics are the line speaking in the child\u2019s own register, and then again for the adult who still wants the owl on their chest.</p>'
    + '<p>Three kids pairs. <strong>Sage</strong> on cream and forest — <em>Think Wise</em> against a skateboard, then the vertical lockup. The pink owl on blush and cream — <em>Be kindly. Be wise.</em> <strong>Ollie</strong> on blue and cream — <em>WISE</em> and <em>Stay Wise</em>. Then the two adult long-sleeves: the face alone on black, and <em>Be wise</em> with the bird filling the back and the sleeve.</p>'
    + gridHtml({
      id: 'food-truth-line-graphic',
      label: 'FOODTRUTH \u00b7 the graphics',
      items: mediaCut('graphic'),
    })
  );
}

export function clothingSwimReply() {
  return (
    '<p>Swim is the line leaving the city. Same owl, printed instead of embroidered, because a rash guard has to survive chlorine and sand.</p>'
    + '<p>Four kids colorways first — blue, pink, green, lilac — rash guards and suits, then the stills so the print is readable. <em>WISE Adventures</em> is the blue set built out: tent, umbrella, towel, ball, bag. The lockup page is the adult cut of the same day — navy and white, deck chairs, a bigger tent, and the mark big enough to read from the water.</p>'
    + gridHtml({
      id: 'food-truth-line-swim',
      label: 'FOODTRUTH \u00b7 beach & swim',
      items: mediaCut('swim'),
    })
  );
}

export function clothingEverydayReply() {
  return (
    '<p>Everyday is the lockup doing the work a graphic would otherwise have to do. No owl illustration — just the wordmark, small, on clothes a person already owns the shape of.</p>'
    + '<p><em>The truth is in the code</em> sits on a tank and a tee; <em>Foodtruth</em> on a white shirt in the kitchen; the tote, the cap and the bottle carry the mark so the table is dressed as well as the people. The family page is the same shirts in the woods and at dinner, kids in the cut too, so the line is visibly one house rather than two catalogues stapled together.</p>'
    + gridHtml({
      id: 'food-truth-line-everyday',
      label: 'FOODTRUTH \u00b7 everyday',
      items: mediaCut('everyday'),
    })
  );
}

export function clothingFormalReply() {
  return (
    '<p>Formal is the proof the line is a house, not a hoodie brand. The owl goes into the cloth instead of onto it.</p>'
    + '<p>The midi dress is owl paisley, front, back and a cloth detail so the bird is a pattern you can miss at ten feet and find at two. The evening gown is ivory silk, one-shoulder, the same mark woven, clutch to match, under the gold lockup. The navy house suit puts the monogram across the cloth and the lockup on the wall behind him. Black tie is the far end: three-piece tuxedo, owl jacquard, no logo on the outside at all.</p>'
    + gridHtml({
      id: 'food-truth-line-formal',
      label: 'FOODTRUTH \u00b7 black-tie & evening',
      items: mediaCut('formal'),
    })
  );
}

if (typeof window !== 'undefined') {
  window.WiseFoodTruth = {
    media: FOOD_TRUTH_LINE_MEDIA,
    mediaHtml: clothingMediaHtml,
    brief: FOOD_TRUTH_LINE_BRIEF,
    lineReply: clothingReply,
    kidsReply: clothingKidsReply,
    accessoriesReply: clothingAccessoriesReply,
    graphicReply: clothingGraphicReply,
    swimReply: clothingSwimReply,
    everydayReply: clothingEverydayReply,
    formalReply: clothingFormalReply,
  };
}
