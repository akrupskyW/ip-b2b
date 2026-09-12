/**
 * wise-clan-campaign.js — Protect Ya Plate / The WISEcode Clan.
 *
 * One shared campaign: a nine-member collective, a clothing drop, and a
 * four-chamber food documentary (Great, Bad, Ultra-Processed, Sad). Pages
 * host it via the reply / view builders; mount wires the player and bios.
 */

import { esc } from './escape-html.js';

const STYLE_ID = 'wise-clan-campaign-styles';
const DEFAULT_BASE = '../assets/wise-clan';
const PLAY_MS = 11000;

const CHAMBERS = {
  great: { id: 'great', label: 'Great', icon: 'eco' },
  bad: { id: 'bad', label: 'Bad', icon: 'error' },
  upf: { id: 'upf', label: 'Ultra-Processed', icon: 'science' },
  sad: { id: 'sad', label: 'Sad', icon: 'nights_stay' },
};

function asset(base, name) {
  return `${String(base || DEFAULT_BASE).replace(/\/$/, '')}/${name}`;
}

export const WISE_CLAN_MEMBERS = [
  {
    id: 'abbot',
    name: 'The Abbot',
    role: 'Architect of the Code',
    chamber: 'great',
    photo: 'abbot.png',
    quote: 'The chamber is the label. Read it or get read.',
    bio: [
      'He built the Code the way a producer builds a beat: every attribute is a sample, every score is a mix. The kitchen that raised him still used the cast-iron skillet his grandmother carried north. That skillet is the first instrument. The database came later.',
      'He does not raise his voice. He raises the standard. The Clan exists because he decided food truth was a public good, not a trade secret — fifteen thousand attributes where a label gives you fifteen, and a score that does not care who paid for the front of the box.',
      'On camera he almost never looks at the lens. He looks at the back of the package, then at the person holding it. The Protect Ya Plate hoodie is not merch to him. It is vestments. Great, in his mouth, is not a mood. It is a method you can repeat on a Tuesday.',
    ],
  },
  {
    id: 'scholar',
    name: 'The Scholar',
    role: 'Ingredient lyricist',
    chamber: 'great',
    photo: 'scholar.png',
    quote: 'Fifteen thousand attributes. Most people get fifteen. That is the whole crime.',
    bio: [
      'He reads an ingredient list the way other people read scripture — slowly, out loud, and with no patience for a synonym that is hiding a process. The first manifesto was written on the back of a torn cereal box. Nutrient quality is his poetry: protein density, fiber, the quiet math of a meal that actually feeds you.',
      'Great, for him, is literacy. Not a clean aisle. Not a halo. The difference between a gum that binds bread and a gum that binds a lie. He can recite it. He has.',
      'In the film he sits with a stack of labels and does not perform surprise. He already knew. The point of the scene is that you did not, and that not-knowing was the product.',
    ],
  },
  {
    id: 'dirty-label',
    name: 'Dirty Label',
    role: 'Package ripper',
    chamber: 'bad',
    photo: 'dirty-label.png',
    quote: 'If the front of the box is a sermon, the back is the confession.',
    bio: [
      'He will open a package in the aisle. He will read the back out loud. He will laugh, and the laugh is not kind, and it is not cruel. It is the sound of a claim meeting its ingredient list.',
      'Bad is his chamber because somebody has to enjoy the work. Titanium dioxide in the “natural” frosting. Red 40 in the “fruit” snack. A vanilla that has never seen a bean. He finds it the way a wild card finds a weak bar — by refusing to stay in the booth.',
      'Brands call him chaotic. He calls himself accurate, which feels the same when you are the brand. The Clan keeps him close because a campaign that cannot stand a ripped box is a campaign about packaging, not food.',
    ],
  },
  {
    id: 'method-plate',
    name: 'Method Plate',
    role: 'The face',
    chamber: 'great',
    photo: 'method-plate.png',
    quote: 'You do not need a chef. You need a method. Then you need a plate.',
    bio: [
      'The face of the drop, and the one who can tell a kid that a vegetable is not a punishment. Charisma as a public-health tool. He cooks on a hot plate in a walk-up and makes it look like a studio because the method was never the kitchen. The method was the decision.',
      'Great, in his verses, is repeatable. Oil you can name. A allium. Something that fermented on purpose. A plate that does not need a laboratory to taste like dinner. He will not shame a vending-machine lunch. He will replace it once, then again, until the replacement is the habit.',
      'The Chamber tee in Great is his — teal, gold mark, nothing cute. He wears it like it already belonged to the block. That is the job.',
    ],
  },
  {
    id: 'chef',
    name: 'The Chef',
    role: 'Chamber cook',
    chamber: 'great',
    photo: 'chef.png',
    quote: 'If it needs a laboratory to taste like food, it was never food.',
    bio: [
      'Chamber cook. Real fire, real oil, real time. She builds a dish the way a verse is built, layer by layer, and she will not take a shortcut that costs the body. Extra virgin. Alliums. The fermented thing that actually fermented. Cocoa and coffee when the score needs polyphenols, not a flavor system.',
      'Her bio is a recipe and a warning. The warning is that “chef” on a box is usually a costume. The recipe is whatever still looks like itself when you put it down.',
      'In Four Chambers she does not plate for the camera. She feeds the crew between setups. The leftover skillet is in the Great still. That was not art direction. That was lunch.',
    ],
  },
  {
    id: 'ghost-meal',
    name: 'Ghost Meal',
    role: 'Keeper of lost kitchens',
    chamber: 'sad',
    photo: 'ghost-meal.png',
    quote: 'The saddest food is the one that used to be a person, and now it is a SKU.',
    bio: [
      'Haunted by kitchens that closed. The Sunday pot that became a drive-through. The grandmother who stopped cooking when the corner store replaced the market. He tells those stories until the room goes quiet, and then he tells the next one.',
      'Sad is not a brand color to him. It is a missing pot. A recipe that only existed in a pair of hands. A child who will not inherit a smell. The documentary’s fourth chamber is his because he is the only one who will sit in it without trying to fix the lighting.',
      'He almost never eats on camera. When he does, it is something that still has a name his grandmother would recognize. That is the whole review.',
    ],
  },
  {
    id: 'inspectah-bite',
    name: 'Inspectah Bite',
    role: 'Barcode inspector',
    chamber: 'bad',
    photo: 'inspectah-bite.png',
    quote: 'I do not hate your product. I counted it.',
    bio: [
      'Barcode first, story second. He is the audit. Eighty-one classified unsafe. The unclear fifteen hundred. He does not perform outrage. He performs inventory, which is worse if you were hoping for a vibe.',
      'If Dirty Label rips the box, Inspectah Bite files it. Bad, in his ledger, is not a taste. It is a count that did not have to be this high — colorants doing no nutritional work, a GRAS status that was never established, a label that legally conceals its own contents.',
      'He is the least famous member and the most quoted in retailer reviews. The Clan lets him have that. Fame was never the point of a barcode.',
    ],
  },
  {
    id: 'u-code',
    name: 'U-Code',
    role: 'Street-to-table',
    chamber: 'great',
    photo: 'u-code.png',
    quote: 'Protect Ya Plate only matters if the plate was reachable.',
    bio: [
      'Street-to-table. Access is the point — a score that only the affluent can act on is a decoration. She maps the good food and the trap food on the same block, same week, same bus line, and she will not let the campaign pretend those are two different cities.',
      'Great, for her, includes dignity. Not a lecture in an empty aisle. A reachable plate: the olive oil that is actually on the shelf, the pot that still works, the recipe that does not require a specialty store and a Saturday.',
      'She is the Clan’s conscience about who the drop is for. If the hoodie cannot be worn on the block that taught them the food, it is a costume. She said that in the first fitting. The fitting changed.',
    ],
  },
  {
    id: 'masta-still',
    name: 'Masta Still',
    role: 'The quiet walk-away',
    chamber: 'sad',
    photo: 'masta-still.png',
    quote: 'Still is not empty. Still is the decision.',
    bio: [
      'The quietest. The one who walks past the vending machine. Refusal as a practice, not a brand. Older than the rest, he has already buried the foods he loved and watched them come back as powder with a cartoon on the front.',
      'He almost never speaks in the film. When he does, the chapter ends. The crew learned to stop rolling a second too late, which is why the Sad chamber holds on his face after the line, and why that hold is the most expensive shot in the picture.',
      'Still, for him, is not emptiness. It is the decision to not pick up what was designed to be picked up. The Clan leaves him that last word because nobody else has earned it.',
    ],
  },
];

export const WISE_CLAN_CHAPTERS = [
  {
    id: 'great',
    title: 'Great',
    still: 'chamber-great.png',
    lede: 'What still looks like itself when you put it down.',
    members: ['abbot', 'scholar', 'method-plate', 'chef', 'u-code'],
    voice: [
      'Great is not a halo. It is a skillet in leftover light. Oil you can name. Bread that fermented on purpose. A pot that still remembers a Sunday. The Clan starts here so the rest of the film has something to lose.',
      'The Abbot calls it method. The Scholar calls it literacy. Method Plate calls it a plate you can repeat. The Chef will not take a shortcut that costs the body. U-Code will not call it great if the plate was never reachable.',
      'WISEcode’s own read sits underneath the poetry: nutrient quality, ingredient quality, health outcomes — the three pillars, scored the same way for a date bar and a bag of dust. Great is the high end of that read, and it is rarer in the aisle than the front of the box wants you to believe.',
    ],
  },
  {
    id: 'bad',
    title: 'Bad',
    still: 'chamber-bad.png',
    lede: 'The front of the box is a sermon. The back is the confession.',
    members: ['dirty-label', 'inspectah-bite'],
    voice: [
      'Bad is the fluorescent aisle after closing, a label torn so the confession can be read under a light that was never meant to flatter. Dirty Label does the tearing. Inspectah Bite does the count.',
      'Colorants that do no nutritional work. A “natural” that has never seen the thing it is named for. Eighty-one ingredients classified unsafe. Fifteen hundred whose GRAS status was never established. Bad is not a taste. It is a ledger.',
      'The campaign does not wag a finger from a farmers’ market. It stands in the aisle you actually use and reads the panel you were not supposed to finish. That is the ad. The clothing is what you wear when you walk out still holding the box.',
    ],
  },
  {
    id: 'upf',
    title: 'Ultra-Processed',
    still: 'chamber-upf.png',
    lede: 'Food that needed a factory to become itself.',
    members: ['abbot', 'dirty-label', 'inspectah-bite', 'scholar'],
    voice: [
      'Ultra-processed is the chamber the Clan was built for. Not “processed” — bread is processed, oil is processed, a pickle is processed. Ultra is the industrial rearrangement: the flavor system, the color system, the shelf-life system, the thing that tastes like childhood because it was engineered to.',
      'The still is an endcap that glows like a warning light. Orange dust in the air. A wall of packages that have more in common with each other than with the plants they advertise. WISEcode’s own tiers live here — moderately, ultra, super-ultra — and the Clan will not flatten them into a vibe.',
      'The Abbot’s line in this chapter is the one on the hoodie: protect the plate, because the aisle will not. Dirty Label laughs once and does not explain the joke. Inspectah Bite files the SKU. The Scholar reads the emulsifier the way a coroner reads a name.',
    ],
  },
  {
    id: 'sad',
    title: 'Sad',
    still: 'chamber-sad.png',
    lede: 'What we lost when dinner became a SKU.',
    members: ['ghost-meal', 'masta-still'],
    voice: [
      'Sad is the empty Formica, the wilted bag, the child’s lunch that was never opened, rain on the glass. Ghost Meal sits in this chamber until the room goes quiet. Masta Still is already standing. He does not sit in other people’s grief. He has his own.',
      'The saddest food is not the worst-scoring cupcake in the database. The saddest food is the one that used to be a person — a grandmother, a Sunday, a smell — and is now a flavor system with a cartoon on the front. Ghost Meal will say that once. He will not say it twice.',
      'The film ends on Still’s walk-away. Not a speech. A vending machine he does not open. Still is not empty. Still is the decision. The drop’s slate tee is this chapter’s color, and nobody in the Clan thinks it should be the bestseller. It is the one you wear when you remember.',
    ],
  },
];

export const WISE_CLAN_DROPS = [
  {
    id: 'hoodie',
    name: 'Protect Ya Plate hoodie',
    price: 180,
    photo: 'hoodie.png',
    blurb: 'Heavyweight black. Gold thread on the back. The campaign’s vestments — The Abbot’s piece, sized so U-Code will wear it on the block that taught them the food.',
  },
  {
    id: 'tee',
    name: 'Chamber Collection tee',
    price: 65,
    photo: 'tee.png',
    blurb: 'Four colorways, one mark: Great in teal, Bad in crimson, Ultra-Processed in rust, Sad in slate. Method Plate’s Great is the one on the poster. The other three are for people who already know which chamber they are in.',
  },
  {
    id: 'cap',
    name: 'Clan cap',
    price: 48,
    photo: 'cap.png',
    blurb: 'Black wool, gold brim stitch, no sermon on the crown. Inspectah Bite’s favorite because it does not try to be a logo.',
  },
  {
    id: 'varsity',
    name: '36 Chambers of the Plate varsity',
    price: 280,
    photo: 'varsity.png',
    blurb: 'Limited drop. Black and gold, striped cuffs, empty back — the film title lives in the lining, not on the jacket. The piece you wear to the screening, then to the store.',
  },
];

function memberById(id) {
  return WISE_CLAN_MEMBERS.find((m) => m.id === id);
}

function chamberOf(id) {
  return CHAMBERS[id] || CHAMBERS.great;
}

function pill(chamberId) {
  const c = chamberOf(chamberId);
  return `<span class="wcl-pill wcl-pill--${esc(c.id)}">${esc(c.label)}</span>`;
}

function memberImg(m, base, cls, alt) {
  return `<img class="${esc(cls)}" src="${esc(asset(base, m.photo))}" alt="${esc(alt || m.name)}" width="400" height="400" loading="lazy" decoding="async">`;
}

function fmtUsd(n) {
  return `$${Number(n).toLocaleString('en-US')}`;
}

export function clanCampaignReply(base) {
  const b = base || DEFAULT_BASE;
  return (
    '<p>Here is the campaign. Not a slogan on a stock photo — a <strong>clothing line</strong> and an <strong>ad</strong> built the way a crew is built.</p>'
    + '<p>The group is <strong>the WISEcode Clan</strong>. Nine members. A collective with the shape of a chambered crew — leader, scholar, wild card, face, cook, ghost, inspector, block, and the quiet one who walks away. The drop is called <strong>Protect Ya Plate</strong>. The film is <strong>Four Chambers</strong>: Great, Bad, Ultra-Processed, and Sad. Food as it still is, food as it lies, food as a factory, food as a loss.</p>'
    + clanPosterHtml(b)
    + '<p>Every member has a headshot and a full bio. The documentary is built around them — what is great, what is bad, what is ultra-processed, and what is sad. The Chamber Collection is the clothing: hoodie, four tees, cap, varsity.</p>'
    + clanStripHtml(b)
    + '<p>Three outputs below — the Clan roster, the Four Chambers film, and the lookbook. Tap a chip when you want to look.</p>'
  );
}

export function clanMeetReply() {
  return (
    '<p>The <strong>WISEcode Clan</strong> — nine members, four chambers, one drop.</p>'
    + '<p><strong>The Abbot</strong> built the Code. <strong>The Scholar</strong> reads the list. <strong>Dirty Label</strong> tears the box. <strong>Method Plate</strong> is the face. <strong>The Chef</strong> feeds the crew. <strong>Ghost Meal</strong> keeps the kitchens that closed. <strong>Inspectah Bite</strong> files the barcode. <strong>U-Code</strong> will not let the plate be a decoration. <strong>Masta Still</strong> walks past the machine.</p>'
    + '<p>Full headshots and bios are on the roster chip — tap it when you want the whole chamber.</p>'
  );
}

export function clanDocReply() {
  return (
    '<p><strong>Four Chambers</strong> is the film. A food documentary built around the Clan — not a product demo with a voiceover taped on.</p>'
    + '<p><strong>Great</strong> is what still looks like itself. <strong>Bad</strong> is the confession on the back of the box. <strong>Ultra-Processed</strong> is food that needed a factory to become itself. <strong>Sad</strong> is what we lost when dinner became a SKU.</p>'
    + '<p>The film is on the output chip. Tap it to play — chapters, stills, and the members who walk each one.</p>'
  );
}

export function clanLookReply() {
  return (
    '<p>The clothing line is <strong>the Chamber Collection</strong> — streetwear for a food-truth crew, not a costume of one.</p>'
    + '<p>The <strong>Protect Ya Plate</strong> hoodie. The four chamber tees. The Clan cap. The <strong>36 Chambers of the Plate</strong> varsity. Gold on black. No sermon on the crown.</p>'
    + '<p>The lookbook is on the output chip.</p>'
  );
}

export function clanChamberReply(chamberId) {
  const ch = WISE_CLAN_CHAPTERS.find((c) => c.id === chamberId) || WISE_CLAN_CHAPTERS[0];
  const names = ch.members.map((id) => {
    const m = memberById(id);
    return m ? m.name : id;
  }).join(', ');
  return (
    `<p>The <strong>${esc(ch.title)}</strong> chamber. ${esc(ch.lede)}</p>`
    + `<p>${ch.voice[0]}</p>`
    + `<p>Walking it: <strong>${esc(names)}</strong>. The full chapter — still, voice, and cast — is on the documentary chip.</p>`
  );
}

function clanPosterHtml(base) {
  return (
    '<figure class="wcl-inline-poster">'
    + `<img class="wcl-inline-poster-img" src="${esc(asset(base, 'poster.png'))}" alt="The WISEcode Clan — Protect Ya Plate campaign still" width="1600" height="900" loading="lazy" decoding="async">`
    + '<figcaption class="wcl-inline-poster-cap"><span class="wcl-serif">Protect Ya Plate</span> · The WISEcode Clan · campaign still</figcaption>'
    + '</figure>'
  );
}

function clanStripHtml(base) {
  const items = WISE_CLAN_MEMBERS.map((m) => (
    `<span class="wcl-strip-item">`
    + memberImg(m, base, 'wcl-strip-img', m.name)
    + `<span class="wcl-strip-name">${esc(m.name)}</span>`
    + `</span>`
  )).join('');
  return `<div class="wcl-strip" role="group" aria-label="The WISEcode Clan">${items}</div>`;
}

export function clanInlineHtml(base) {
  return clanPosterHtml(base || DEFAULT_BASE) + clanStripHtml(base || DEFAULT_BASE);
}

export function clanRosterView(base) {
  const b = base || DEFAULT_BASE;
  const cards = WISE_CLAN_MEMBERS.map((m) => {
    const paras = m.bio.map((p) => `<p>${esc(p)}</p>`).join('');
    return (
      `<article class="wcl-card" data-wcl-member="${esc(m.id)}">`
      + `<button type="button" class="wcl-card-face" data-wcl-toggle="${esc(m.id)}" aria-expanded="false" aria-controls="wcl-bio-${esc(m.id)}">`
      + memberImg(m, b, 'wcl-card-img', `${m.name}, ${m.role}`)
      + `<span class="wcl-card-meta">`
      + `<span class="wcl-card-kicker">${pill(m.chamber)}</span>`
      + `<span class="wcl-serif wcl-card-name">${esc(m.name)}</span>`
      + `<span class="wcl-card-role">${esc(m.role)}</span>`
      + `</span>`
      + `</button>`
      + `<div class="wcl-card-bio" id="wcl-bio-${esc(m.id)}" hidden>`
      + `<p class="wcl-quote">“${esc(m.quote)}”</p>`
      + paras
      + `</div>`
      + `</article>`
    );
  }).join('');
  return `
    <div class="wa-block wa-report wcl-block" data-wcl="roster">
      <div class="wa-report-hero">
        <p class="wcl-eyebrow">The WISEcode Clan · nine members</p>
        <h2 class="wa-report-title">Protect Ya Plate</h2>
        <p class="wa-report-lede">A crew built like a chambered collective — headshots, full bios, and the food each one carries. Tap a member to open the bio.</p>
      </div>
      <div class="wa-stats wcl-stats">
        <div class="wa-stat"><div class="wa-stat-num" data-countup>9</div><div class="wa-stat-label">Members</div></div>
        <div class="wa-stat"><div class="wa-stat-num" data-countup>4</div><div class="wa-stat-label">Chambers</div></div>
        <div class="wa-stat"><div class="wa-stat-num" data-countup>4</div><div class="wa-stat-label">Drops</div></div>
      </div>
      <div class="wcl-grid">${cards}</div>
    </div>`;
}

export function clanDocView(opts) {
  const o = opts || {};
  const b = o.base || DEFAULT_BASE;
  const start = CHAMBERS[o.chapter] ? o.chapter : 'great';
  const titleCard = !o.chapter;
  const ch = WISE_CLAN_CHAPTERS.find((c) => c.id === start) || WISE_CLAN_CHAPTERS[0];
  const stillName = titleCard ? 'poster.png' : ch.still;
  const stillAlt = titleCard ? 'Four Chambers title card — the WISEcode Clan' : `${ch.title} chamber still`;
  const tabs = WISE_CLAN_CHAPTERS.map((c) => (
    `<button type="button" class="wcl-tab${c.id === start && !titleCard ? ' is-on' : ''}" data-wcl-chapter="${esc(c.id)}" aria-pressed="${c.id === start && !titleCard ? 'true' : 'false'}">`
    + `<span class="material-symbols-outlined" aria-hidden="true">${esc(chamberOf(c.id).icon)}</span>${esc(c.title)}`
    + `</button>`
  )).join('');
  return `
    <div class="wa-block wa-report wcl-block wcl-doc" data-wcl="doc" data-wcl-chapter="${esc(start)}" data-wcl-base="${esc(b)}"${titleCard ? ' data-wcl-title-card="1"' : ''}>
      <div class="wcl-stage">
        <img class="wcl-stage-img" data-wcl-still src="${esc(asset(b, stillName))}" alt="${esc(stillAlt)}" width="1600" height="900">
        <div class="wcl-stage-shade"></div>
        <div class="wcl-stage-copy">
          <p class="wcl-eyebrow wcl-eyebrow--onfilm">Four Chambers · a WISEcode Clan film</p>
          <h2 class="wa-report-title wcl-stage-title">Protect Ya Plate</h2>
        </div>
        <button type="button" class="wcl-play" data-wcl-play aria-pressed="false" aria-label="Play the documentary">
          <span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>
        </button>
      </div>
      <div class="wcl-tabs" role="tablist" aria-label="Documentary chambers">${tabs}</div>
      <div class="wcl-doc-body">
        <p class="wcl-eyebrow" data-wcl-eyebrow>Chamber · ${esc(ch.title)}</p>
        <h3 class="wa-report-title wcl-doc-title" data-wcl-title>${esc(ch.title)}</h3>
        <p class="wcl-doc-lede" data-wcl-lede>${esc(ch.lede)}</p>
        <div class="wcl-vo" data-wcl-vo>${ch.voice.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        <div class="wcl-cast" data-wcl-cast>${castHtml(ch, b)}</div>
      </div>
    </div>`;
}

function castHtml(ch, base) {
  return ch.members.map((id) => {
    const m = memberById(id);
    if (!m) return '';
    return (
      `<span class="wcl-cast-item">`
      + memberImg(m, base, 'wcl-cast-img', m.name)
      + `<span class="wcl-cast-name">${esc(m.name)}</span>`
      + `</span>`
    );
  }).join('');
}

export function clanLookView(base) {
  const b = base || DEFAULT_BASE;
  const items = WISE_CLAN_DROPS.map((d) => (
    `<article class="wcl-drop">`
    + `<img class="wcl-drop-img" src="${esc(asset(b, d.photo))}" alt="${esc(d.name)}" width="1200" height="900" loading="lazy" decoding="async">`
    + `<div class="wcl-drop-body">`
    + `<h3 class="wcl-serif wcl-drop-name">${esc(d.name)}</h3>`
    + `<p class="wcl-drop-price">${fmtUsd(d.price)}</p>`
    + `<p class="wcl-drop-blurb">${esc(d.blurb)}</p>`
    + `</div>`
    + `</article>`
  )).join('');
  return `
    <div class="wa-block wa-report wcl-block" data-wcl="look">
      <div class="wcl-look-hero">
        <img class="wcl-look-hero-img" src="${esc(asset(b, 'poster.png'))}" alt="Protect Ya Plate campaign still" width="1600" height="900" loading="lazy" decoding="async">
        <div class="wcl-look-hero-copy">
          <p class="wcl-eyebrow wcl-eyebrow--onfilm">The Chamber Collection</p>
          <h2 class="wa-report-title wcl-stage-title">Protect Ya Plate</h2>
          <p class="wcl-look-hero-lede">Streetwear for a food-truth crew. Gold on black. Four chambers, one drop.</p>
        </div>
      </div>
      <div class="wcl-drops">${items}</div>
    </div>`;
}

function applyChapter(doc, id) {
  const ch = WISE_CLAN_CHAPTERS.find((c) => c.id === id);
  if (!ch || !doc) return;
  const base = doc.getAttribute('data-wcl-base') || DEFAULT_BASE;
  doc.dataset.wclChapter = ch.id;
  const still = doc.querySelector('[data-wcl-still]');
  if (still) {
    still.src = asset(base, ch.still);
    still.alt = `${ch.title} chamber still`;
  }
  const eyebrow = doc.querySelector('[data-wcl-eyebrow]');
  if (eyebrow) eyebrow.textContent = `Chamber · ${ch.title}`;
  const title = doc.querySelector('[data-wcl-title]');
  if (title) title.textContent = ch.title;
  const lede = doc.querySelector('[data-wcl-lede]');
  if (lede) lede.textContent = ch.lede;
  const vo = doc.querySelector('[data-wcl-vo]');
  if (vo) vo.innerHTML = ch.voice.map((p) => `<p>${esc(p)}</p>`).join('');
  const cast = doc.querySelector('[data-wcl-cast]');
  if (cast) cast.innerHTML = castHtml(ch, base);
  doc.querySelectorAll('[data-wcl-chapter]').forEach((tab) => {
    const on = tab.getAttribute('data-wcl-chapter') === ch.id;
    tab.classList.toggle('is-on', on);
    tab.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function nextChapterId(cur) {
  const i = WISE_CLAN_CHAPTERS.findIndex((c) => c.id === cur);
  const n = WISE_CLAN_CHAPTERS[(i + 1) % WISE_CLAN_CHAPTERS.length];
  return n.id;
}

function reduceMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function stopPlay(doc) {
  if (!doc) return;
  const t = doc._wclTimer;
  if (t) {
    clearInterval(t);
    doc._wclTimer = 0;
  }
  const btn = doc.querySelector('[data-wcl-play]');
  if (btn) {
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Play the documentary');
    const ic = btn.querySelector('.material-symbols-outlined');
    if (ic) ic.textContent = 'play_arrow';
  }
}

function startPlay(doc) {
  if (!doc || reduceMotion()) {
    if (doc && doc.dataset.wclTitleCard === '1') {
      applyChapter(doc, doc.dataset.wclChapter || 'great');
      delete doc.dataset.wclTitleCard;
    }
    return;
  }
  if (doc.dataset.wclTitleCard === '1') {
    applyChapter(doc, doc.dataset.wclChapter || 'great');
    delete doc.dataset.wclTitleCard;
  }
  stopPlay(doc);
  const btn = doc.querySelector('[data-wcl-play]');
  if (btn) {
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Pause the documentary');
    const ic = btn.querySelector('.material-symbols-outlined');
    if (ic) ic.textContent = 'pause';
  }
  doc._wclTimer = setInterval(() => {
    applyChapter(doc, nextChapterId(doc.dataset.wclChapter || 'great'));
  }, PLAY_MS);
}

function toggleMember(card) {
  if (!card) return;
  const face = card.querySelector('[data-wcl-toggle]');
  const bio = card.querySelector('.wcl-card-bio');
  const open = face && face.getAttribute('aria-expanded') === 'true';
  const root = card.closest('[data-wcl="roster"]') || card.parentElement;
  if (root) {
    root.querySelectorAll('.wcl-card').forEach((other) => {
      if (other === card) return;
      const f = other.querySelector('[data-wcl-toggle]');
      const b = other.querySelector('.wcl-card-bio');
      if (f) f.setAttribute('aria-expanded', 'false');
      if (b) b.hidden = true;
      other.classList.remove('is-open');
    });
  }
  if (face) face.setAttribute('aria-expanded', open ? 'false' : 'true');
  if (bio) bio.hidden = !!open;
  card.classList.toggle('is-open', !open);
}

function onClick(e) {
  const play = e.target.closest && e.target.closest('[data-wcl-play]');
  if (play) {
    const doc = play.closest('[data-wcl="doc"]');
    if (!doc) return;
    e.preventDefault();
    if (play.getAttribute('aria-pressed') === 'true') stopPlay(doc);
    else startPlay(doc);
    return;
  }
  const tab = e.target.closest && e.target.closest('[data-wcl-chapter]');
  if (tab) {
    const doc = tab.closest('[data-wcl="doc"]');
    if (!doc) return;
    e.preventDefault();
    stopPlay(doc);
    delete doc.dataset.wclTitleCard;
    applyChapter(doc, tab.getAttribute('data-wcl-chapter'));
    return;
  }
  const face = e.target.closest && e.target.closest('[data-wcl-toggle]');
  if (face) {
    e.preventDefault();
    toggleMember(face.closest('.wcl-card'));
  }
}

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  document.head.appendChild(style);
  style.textContent = `
.wcl-serif { font-family: 'WISE Digits', 'Noto Serif', serif; font-weight: 800; letter-spacing: -0.02em; }
.wcl-eyebrow {
  margin: 0 0 6px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-subtle);
}
.wcl-eyebrow--onfilm { color: color-mix(in srgb, #fff 78%, transparent); }
.wcl-block { padding-bottom: 8px; }
.wcl-stats { margin-bottom: 18px; }

.wcl-pill {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  border: 1px solid transparent;
}
.wcl-pill--great { color: var(--sec-green-text, #1B5E3B); background: color-mix(in srgb, var(--sec-green, #2E8B57) 14%, transparent); border-color: color-mix(in srgb, var(--sec-green, #2E8B57) 28%, transparent); }
.wcl-pill--bad { color: var(--sec-red-text, #8B1E1E); background: color-mix(in srgb, var(--sec-red, #C0392B) 14%, transparent); border-color: color-mix(in srgb, var(--sec-red, #C0392B) 28%, transparent); }
.wcl-pill--upf { color: color-mix(in srgb, var(--chart-status-fair, #C47B2B) 80%, #000); background: color-mix(in srgb, var(--chart-status-fair, #C47B2B) 16%, transparent); border-color: color-mix(in srgb, var(--chart-status-fair, #C47B2B) 32%, transparent); }
.wcl-pill--sad { color: var(--text-muted); background: color-mix(in srgb, var(--text-muted) 12%, transparent); border-color: color-mix(in srgb, var(--text-muted) 22%, transparent); }
html.dark .wcl-pill--great { color: var(--sec-green, #6D947C); }
html.dark .wcl-pill--bad { color: color-mix(in srgb, var(--sec-red, #E07070) 86%, #fff); }
html.dark .wcl-pill--upf { color: var(--ter-amber, #E0B15C); }
html.dark .wcl-pill--sad { color: var(--text-muted); }

.wcl-inline-poster { margin: 0.7em 0 0.35em; }
.wcl-inline-poster-img {
  display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover;
  border-radius: 14px; background: #111;
}
.wcl-inline-poster-cap {
  margin-top: 7px; font-size: 0.78em; line-height: 1.45; color: var(--text-muted);
}
.wcl-strip {
  display: flex; flex-wrap: wrap; gap: 10px 12px;
  margin: 12px 0 4px;
}
.wcl-strip-item {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  width: 64px; text-align: center;
}
.wcl-strip-img {
  width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
  background: #1A2339;
}
.wcl-strip-name {
  font-size: 10px; font-weight: 700; line-height: 1.25; color: var(--text-muted);
}

.wcl-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
}
.wcl-card {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  overflow: hidden;
}
html.dark .wcl-card { background: #1A2339; }
html.chat-tint:not(.dark) .wcl-card { background: color-mix(in srgb, var(--primary) 5%, #fff); }
html.dark.chat-tint .wcl-card { background: color-mix(in srgb, var(--primary-bright, #8B9FAF) 8%, #1A2339); }
.wcl-card.is-open { grid-column: 1 / -1; }
.wcl-card-face {
  display: flex; flex-direction: column; align-items: stretch;
  width: 100%; padding: 0; border: 0; background: transparent;
  font-family: inherit; color: inherit; cursor: pointer; text-align: left;
}
.wcl-card-face:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.wcl-card-img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; background: #111; }
.wcl-card-meta { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px 12px; }
.wcl-card-name { font-size: 1.05rem; line-height: 1.2; color: var(--text); }
.wcl-card-role { font-size: 12px; color: var(--text-muted); }
.wcl-card-bio { padding: 0 14px 16px; max-width: 640px; }
.wcl-card-bio p { margin: 0 0 0.7em; font-size: 13.5px; line-height: 1.6; color: var(--text); }
.wcl-card-bio p:last-child { margin-bottom: 0; }
.wcl-quote {
  font-family: 'WISE Digits', 'Noto Serif', serif;
  font-size: 1.15rem; font-weight: 700; line-height: 1.35;
  color: var(--text); margin: 4px 0 12px !important;
}

.wcl-stage {
  position: relative; overflow: hidden; border-radius: 14px;
  background: #0B1020; margin-bottom: 12px;
  max-height: min(340px, 40vh);
}
.wcl-stage-img {
  display: block; width: 100%; height: min(340px, 40vh);
  object-fit: cover; object-position: center 30%;
}
.wcl-stage-shade {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(8,10,18,0.88) 0%, rgba(8,10,18,0.2) 55%, rgba(8,10,18,0.35) 100%);
  pointer-events: none;
}
.wcl-stage-copy {
  position: absolute; left: 18px; right: 88px; bottom: 16px;
  pointer-events: none;
}
.wcl-stage-title { color: #fff !important; margin: 0 !important; }
.wcl-play {
  position: absolute; right: 16px; bottom: 16px;
  display: grid; place-items: center;
  width: 48px; height: 48px; padding: 0;
  border: 0; border-radius: 50%;
  background: var(--primary); color: #fff; cursor: pointer;
  box-shadow: 0 8px 22px rgba(0,0,0,0.28);
}
.wcl-doc[data-wcl-title-card="1"] .wcl-play {
  top: 50%; left: 50%; right: auto; bottom: auto;
  transform: translate(-50%, -50%);
  width: 64px; height: 64px;
}
.wcl-play:hover { filter: brightness(1.06); }
.wcl-play:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.wcl-play .material-symbols-outlined {
  font-size: 26px !important;
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.wcl-doc[data-wcl-title-card="1"] .wcl-play .material-symbols-outlined { font-size: 34px !important; }
.wcl-tabs {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin: 0 0 16px;
}
.wcl-tab {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--surface); color: var(--text-muted);
  font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
}
html.dark .wcl-tab { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); }
.wcl-tab:hover { color: var(--text); border-color: var(--primary); }
.wcl-tab.is-on { color: #fff; border-color: var(--primary); background: var(--primary); font-weight: 700; }
.wcl-tab .material-symbols-outlined { font-size: 15px !important; }
.wcl-doc-title { margin: 0 0 6px !important; }
.wcl-doc-lede { margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: var(--text-muted); }
.wcl-vo p { margin: 0 0 0.85em; font-size: 13.5px; line-height: 1.65; color: var(--text); max-width: 680px; }
.wcl-vo p:last-child { margin-bottom: 0; }
.wcl-cast { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.wcl-cast-item { display: flex; flex-direction: column; align-items: center; gap: 5px; width: 72px; text-align: center; }
.wcl-cast-img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
.wcl-cast-name { font-size: 10.5px; font-weight: 700; line-height: 1.25; color: var(--text-muted); }

.wcl-look-hero { position: relative; overflow: hidden; border-radius: 14px; margin-bottom: 16px; background: #0B1020; max-height: min(280px, 34vh); }
.wcl-look-hero-img { display: block; width: 100%; height: min(280px, 34vh); object-fit: cover; object-position: center 25%; }
.wcl-look-hero-copy {
  position: absolute; left: 18px; right: 18px; bottom: 16px;
}
.wcl-look-hero-lede { margin: 6px 0 0; max-width: 420px; font-size: 13px; line-height: 1.5; color: color-mix(in srgb, #fff 78%, transparent); }
.wcl-drops { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.wcl-drop {
  margin: 0; border: 1px solid var(--border); border-radius: 14px;
  background: var(--surface); overflow: hidden;
}
html.dark .wcl-drop { background: #1A2339; }
.wcl-drop-img { display: block; width: 100%; aspect-ratio: 1; max-height: 168px; object-fit: cover; background: #111; }
.wcl-drop-body { padding: 10px 12px 12px; }
.wcl-drop-name { margin: 0 0 4px; font-size: 1.15rem; line-height: 1.2; color: var(--text); }
.wcl-drop-price { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--text-muted); }
.wcl-drop-blurb { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--text); }

@media (max-width: 640px) {
  .wcl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wcl-card.is-open { grid-column: 1 / -1; }
  .wcl-stage-copy { right: 18px; }
}
`;
}

let bound = false;
export function mountWiseClan() {
  injectStyles();
  if (bound || typeof document === 'undefined') return;
  bound = true;
  document.addEventListener('click', onClick);
}

if (typeof window !== 'undefined') {
  window.WiseClanCampaign = {
    members: WISE_CLAN_MEMBERS,
    chapters: WISE_CLAN_CHAPTERS,
    drops: WISE_CLAN_DROPS,
    campaignReply: clanCampaignReply,
    meetReply: clanMeetReply,
    docReply: clanDocReply,
    lookReply: clanLookReply,
    chamberReply: clanChamberReply,
    rosterView: clanRosterView,
    docView: clanDocView,
    lookView: clanLookView,
    inlineHtml: clanInlineHtml,
    mount: mountWiseClan,
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWiseClan, { once: true });
  } else {
    mountWiseClan();
  }
}
